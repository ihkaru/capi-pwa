<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\KegiatanStatistik;
use App\Models\Assignment; // New import
use App\Models\MasterData; // New import
use Spatie\Permission\Models\Role;
use Carbon\Carbon;

class ActivityApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Ensure roles exist for testing
        Role::firstOrCreate(['name' => 'PPL']);
        Role::firstOrCreate(['name' => 'PML']);
    }

    /** @test */
    public function authenticated_user_can_get_their_activities()
    {
        // Create a user
        $user = User::factory()->create();

        // Assign a role to the user (e.g., PPL)
        $user->assignRole('PPL');

        // Create some activities
        $activity1 = KegiatanStatistik::factory()->create([
            'name' => 'Activity One',
            'year' => 2024,
            'start_date' => Carbon::now()->subDays(10),
            'end_date' => Carbon::now()->addDays(10),
        ]);
        $activity2 = KegiatanStatistik::factory()->create([
            'name' => 'Activity Two',
            'year' => 2023,
            'start_date' => Carbon::now()->subYears(1)->subDays(10),
            'end_date' => Carbon::now()->subYears(1)->addDays(10),
        ]);
        $activity3 = KegiatanStatistik::factory()->create([
            'name' => 'Activity Three',
            'year' => 2025,
            'start_date' => Carbon::now()->addDays(5),
            'end_date' => Carbon::now()->addDays(15),
        ]);

        // Attach user to activities
        $user->kegiatanStatistiks()->attach($activity1->id);
        $user->kegiatanStatistiks()->attach($activity2->id);
        $user->kegiatanStatistiks()->attach($activity3->id);

        // Act as the user and make a GET request to /api/activities
        $response = $this->actingAs($user, 'sanctum')->getJson('/api/activities');

        // Assert that the response is successful
        $response->assertOk();

        // Assert that the response contains the correct activities and their formatted data
        $response->assertJsonCount(3, 'data');
        $response->assertJsonFragment([
            'id' => $activity1->id,
            'name' => 'Activity One',
            'year' => '2024',
            'user_role' => 'PPL',
            'status' => 'Berlangsung',
        ]);
        $response->assertJsonFragment([
            'id' => $activity2->id,
            'name' => 'Activity Two',
            'year' => '2023',
            'user_role' => 'PPL',
            'status' => 'Selesai',
        ]);
        $response->assertJsonFragment([
            'id' => $activity3->id,
            'name' => 'Activity Three',
            'year' => '2025',
            'user_role' => 'PPL',
            'status' => 'Akan Datang',
        ]);
    }

    /** @test */
    public function unauthenticated_user_cannot_get_activities()
    {
        $response = $this->getJson('/api/activities');

        $response->assertUnauthorized(); // 401 status
    }

    /** @test */
    public function authenticated_ppl_user_can_get_initial_activity_data()
    {
        // Create a PPL user
        $user = User::factory()->create();
        $user->assignRole('PPL');

        // Create a KegiatanStatistik with form_schema and masters_used
        $formSchema = [
            'masters_used' => [
                ['type' => 'KBLI', 'version' => 2020],
                ['type' => 'WILAYAH_INDONESIA', 'version' => 1],
            ],
            'pages' => [], // Dummy pages
        ];
        $kegiatan = KegiatanStatistik::factory()->create([
            'form_schema' => $formSchema,
        ]);

        // Attach user to the activity
        $user->kegiatanStatistiks()->attach($kegiatan->id);

        // Create Assignments for this PPL user within this activity
        $assignment1 = Assignment::factory()->create([
            'kegiatan_statistik_id' => $kegiatan->id,
            'ppl_id' => $user->id,
            'pml_id' => User::factory()->create()->id, // Dummy PML
        ]);
        $assignment2 = Assignment::factory()->create([
            'kegiatan_statistik_id' => $kegiatan->id,
            'ppl_id' => $user->id,
            'pml_id' => User::factory()->create()->id, // Dummy PML
        ]);

        // Create MasterData entries matching masters_used
        $masterDataKBLI = MasterData::factory()->create([
            'type' => 'KBLI',
            'version' => 2020,
            'data' => json_encode(['kbli_item_1', 'kbli_item_2']),
        ]);
        $masterDataWilayah = MasterData::factory()->create([
            'type' => 'WILAYAH_INDONESIA',
            'version' => 1,
            'data' => json_encode(['wilayah_item_a', 'wilayah_item_b']),
        ]);

        // Act as the user and make a GET request
        $response = $this->actingAs($user, 'sanctum')->getJson("/api/activities/{$kegiatan->id}/initial-data");

        // Assert that the response is successful
        $response->assertOk();

        // Assert response structure and data
        $response->assertJsonStructure([
            'data' => [
                'activity' => [
                    'id',
                    'name',
                    'year',
                    'user_role',
                    'status',
                ],
                'assignments',
                'form_schema',
                'master_data' => [
                    ['type', 'version', 'data'],
                ],
            ],
        ]);

        $response->assertJsonFragment([
            'id' => $kegiatan->id,
            'name' => $kegiatan->name,
            'year' => (string)$kegiatan->year,
            'user_role' => 'PPL',
        ]);

        $response->assertJsonCount(2, 'data.assignments');
        $response->assertJsonFragment([
            'id' => $assignment1->id,
            'kegiatan_statistik_id' => $kegiatan->id,
            'ppl_id' => $user->id,
        ]);

        $response->assertJsonFragment([
            'type' => 'KBLI',
            'version' => 2020,
            'data' => json_encode(['kbli_item_1', 'kbli_item_2']),
        ]);
        $response->assertJsonFragment([
            'type' => 'WILAYAH_INDONESIA',
            'version' => 1,
            'data' => json_encode(['wilayah_item_a', 'wilayah_item_b']),
        ]);
    }

    /** @test */
    public function authenticated_pml_user_can_get_initial_activity_data()
    {
        // Create a PML user
        $user = User::factory()->create();
        $user->assignRole('PML');

        // Create a KegiatanStatistik
        $kegiatan = KegiatanStatistik::factory()->create();

        // Attach user to the activity
        $user->kegiatanStatistiks()->attach($kegiatan->id);

        // Create Assignments for this PML user within this activity
        $pplUser = User::factory()->create();
        $assignment1 = Assignment::factory()->create([
            'kegiatan_statistik_id' => $kegiatan->id,
            'ppl_id' => $pplUser->id,
            'pml_id' => $user->id,
        ]);
        $assignment2 = Assignment::factory()->create([
            'kegiatan_statistik_id' => $kegiatan->id,
            'ppl_id' => User::factory()->create()->id,
            'pml_id' => $user->id,
        ]);

        // Act as the user and make a GET request
        $response = $this->actingAs($user, 'sanctum')->getJson("/api/activities/{$kegiatan->id}/initial-data");

        // Assert that the response is successful
        $response->assertOk();

        // Assert response structure and data
        $response->assertJsonStructure([
            'data' => [
                'activity',
                'assignments',
                'form_schema',
                'master_data',
            ],
        ]);

        $response->assertJsonCount(2, 'data.assignments');
        $response->assertJsonFragment([
            'id' => $assignment1->id,
            'kegiatan_statistik_id' => $kegiatan->id,
            'pml_id' => $user->id,
        ]);
    }

    /** @test */
    public function user_cannot_get_initial_activity_data_if_not_member()
    {
        // Create a user and an activity
        $user = User::factory()->create();
        $user->assignRole('PPL'); // Assign a role, but not attached to this activity
        $kegiatan = KegiatanStatistik::factory()->create();

        // Act as the user and make a GET request
        $response = $this->actingAs($user, 'sanctum')->getJson("/api/activities/{$kegiatan->id}/initial-data");

        // Assert 404 Not Found (because firstOrFail will fail if not a member)
        $response->assertNotFound();
    }

    /** @test */
    public function user_cannot_get_initial_activity_data_if_not_ppl_or_pml()
    {
        // Create a user with a different role (e.g., admin_satker)
        $user = User::factory()->create();
        Role::firstOrCreate(['name' => 'admin_satker']);
        $user->assignRole('admin_satker');

        // Create an activity and attach the user as a member
        $kegiatan = KegiatanStatistik::factory()->create();
        $user->kegiatanStatistiks()->attach($kegiatan->id);

        // Act as the user and make a GET request
        $response = $this->actingAs($user, 'sanctum')->getJson("/api/activities/{$kegiatan->id}/initial-data");

        // Assert 403 Forbidden
        $response->assertForbidden();
    }

    /** @test */
    public function unauthenticated_user_cannot_get_initial_activity_data()
    {
        $kegiatan = KegiatanStatistik::factory()->create();
        $response = $this->getJson("/api/activities/{$kegiatan->id}/initial-data");

        $response->assertUnauthorized(); // 401 status
    }

    /** @test */
    public function cannot_get_initial_data_for_non_existent_activity()
    {
        $user = User::factory()->create();
        $user->assignRole('PPL');

        $nonExistentId = '00000000-0000-0000-0000-000000000000'; // A dummy UUID

        $response = $this->actingAs($user, 'sanctum')->getJson("/api/activities/{$nonExistentId}/initial-data");

        $response->assertNotFound();
    }
}
