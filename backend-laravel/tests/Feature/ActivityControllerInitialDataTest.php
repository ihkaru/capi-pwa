<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\KegiatanStatistik;
use Database\Seeders\SatkerSeeder;
use Database\Seeders\UserSeeder;
use Database\Seeders\KegiatanStatistikSeeder;
use Database\Seeders\KegiatanSatkerSeeder;
use Spatie\Permission\Models\Role;
use App\Constants;

class ActivityControllerInitialDataTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Manually create roles that the UserSeeder depends on
        Role::findOrCreate(Constants::ROLE_SUPER_ADMIN, 'web');
        Role::findOrCreate(Constants::ROLE_ADMIN_SATKER, 'web');
        Role::findOrCreate(Constants::ROLE_ADMIN_KEGIATAN, 'web');
        Role::findOrCreate(Constants::ROLE_PML, 'web');
        Role::findOrCreate(Constants::ROLE_PPL, 'web');

        // Seed the database with necessary data
        $this->seed(SatkerSeeder::class);
        $this->seed(UserSeeder::class);
        $this->seed(KegiatanStatistikSeeder::class);
        $this->seed(KegiatanSatkerSeeder::class);
    }

    /**
     * Test the getInitialData endpoint returns the correct form schema.
     *
     * @return void
     */
    public function test_get_initial_data_returns_correct_schema(): void
    {
        // Arrange: Find the specific user and activity for the test
        $user = User::where('email', 'ihzathegodslayer@gmail.com')->firstOrFail();
        $user->assignRole(Constants::ROLE_PPL);

        $kegiatan = KegiatanStatistik::where('name', 'REGSOSEK 2022 - LISTING')->firstOrFail();

        // Ensure the user is a member of the activity
        $kegiatan->members()->syncWithoutDetaching([$user->id]);

        // Act: Simulate an authenticated API call to the endpoint
        $response = $this->actingAs($user)->getJson("/api/activities/{$kegiatan->id}/initial-data");

        // Assert: Check the response
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                'activity',
                'assignments',
                'assignmentResponses',
                'master_sls',
                'form_schema' => [
                    'assignment_table_columns'
                ],
                'master_data',
            ]
        ]);

        $formSchema = $response->json('data.form_schema');
        $columns = $formSchema['assignment_table_columns'];

        // Assert that there are 3 columns, as per our latest schema
        $this->assertCount(3, $columns, "Expected 3 columns, but found " . count($columns) . ".");

        // Assert that the columns have the new, detailed structure
        foreach ($columns as $column) {
            $this->assertArrayHasKey('key', $column);
            $this->assertArrayHasKey('label', $column);
            $this->assertArrayHasKey('type', $column, "Column '" . ($column['key'] ?? 'N/A') . "' is missing the 'type' property.");
            $this->assertArrayHasKey('default', $column, "Column '" . ($column['key'] ?? 'N/A') . "' is missing the 'default' property.");
            $this->assertArrayHasKey('sortable', $column, "Column '" . ($column['key'] ?? 'N/A') . "' is missing the 'sortable' property.");
            $this->assertArrayHasKey('filterable', $column, "Column '" . ($column['key'] ?? 'N/A') . "' is missing the 'filterable' property.");
        }

        // Assert the key of the third column is correct
        $this->assertEquals('response.responses.jumlah_art', $columns[2]['key'], "The key of the third column is incorrect.");
    }
}
