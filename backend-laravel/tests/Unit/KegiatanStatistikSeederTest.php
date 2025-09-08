<?php

namespace Tests\Unit;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Database\Seeders\KegiatanStatistikSeeder;
use App\Models\KegiatanStatistik;
use Illuminate\Support\Facades\File;

class KegiatanStatistikSeederTest extends TestCase
{
    use RefreshDatabase; // This trait resets the database for each test.

    /**
     * A basic unit test to verify the seeder correctly updates the form schema.
     *
     * @return void
     */
    public function test_seeder_updates_form_schema_correctly(): void
    {
        // Arrange: Mock the File facade to ensure we control the JSON input
        $newSchemaPath = base_path('../frontend-pwa/public/dev-data/regsosek-listing-schema.json');
        $newSchemaJson = File::get($newSchemaPath);
        $newSchemaArray = json_decode($newSchemaJson, true);

        // Act: Run the seeder
        $this->seed(KegiatanStatistikSeeder::class);

        // Assert: Check the database content
        $kegiatan = KegiatanStatistik::where('name', 'REGSOSEK 2022 - LISTING')->first();

        // 1. Assert that the activity was actually found
        $this->assertNotNull($kegiatan, "REGSOSEK 2022 - LISTING activity was not found in the database.");

        // 2. Assert that the form_schema is not null
        $this->assertNotNull($kegiatan->form_schema, "form_schema is null.");

        // 3. Assert that assignment_table_columns exists
        $this->assertArrayHasKey('assignment_table_columns', $kegiatan->form_schema, "form_schema does not have assignment_table_columns key.");

        $columns = $kegiatan->form_schema['assignment_table_columns'];

        // 4. Assert that there are 3 columns, as per our latest schema
        $this->assertCount(3, $columns, "Expected 3 columns, but found " . count($columns) . ".");

        // 5. Assert that the columns have the new, detailed structure
        foreach ($columns as $column) {
            $this->assertArrayHasKey('key', $column);
            $this->assertArrayHasKey('label', $column);
            $this->assertArrayHasKey('type', $column, "Column '" . $column['key'] . "' is missing the 'type' property.");
            $this->assertArrayHasKey('default', $column, "Column '" . $column['key'] . "' is missing the 'default' property.");
            $this->assertArrayHasKey('sortable', $column, "Column '" . $column['key'] . "' is missing the 'sortable' property.");
            $this->assertArrayHasKey('filterable', $column, "Column '" . $column['key'] . "' is missing the 'filterable' property.");
        }

        // 6. Assert the key of the third column is correct
        $this->assertEquals('response.responses.jumlah_art', $columns[2]['key'], "The key of the third column is incorrect.");
    }
}
