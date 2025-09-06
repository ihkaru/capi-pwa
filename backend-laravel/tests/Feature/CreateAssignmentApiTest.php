<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\KegiatanStatistik;
use App\Models\Assignment;
use App\Models\AssignmentResponse;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Str;

class CreateAssignmentApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'PPL']);
        Role::firstOrCreate(['name' => 'PML']);
    }

    /** @test */
    public function ppl_can_create_new_assignment_for_allowed_activity()
    {
        $ppl = User::factory()->create();
        $ppl->assignRole('PPL');

        $activity = KegiatanStatistik::factory()->create([
            'allow_new_assignments_from_pwa' => true,
        ]);
        $activity->members()->attach($ppl);

        $newAssignmentId = (string) Str::uuid();
        $newAssignmentResponseId = (string) Str::uuid();

        $response = $this->actingAs($ppl, 'sanctum')->postJson(
            "/api/activities/{$activity->id}/assignments/create",
            [
                'assignment' => [
                    'id' => $newAssignmentId,
                    'kegiatan_statistik_id' => $activity->id,
                    'ppl_id' => $ppl->id,
                    'pml_id' => null,
                    'assignment_label' => 'Keluarga Baru Test',
                    'level_1_code' => '1',
                    'level_1_label' => 'Provinsi A',
                    'status' => 'Assigned',
                ],
                'assignment_response' => [
                    'assignment_id' => $newAssignmentId,
                    'user_id' => $ppl->id,
                    'status' => 'Assigned',
                    'version' => 1,
                    'form_version_used' => 1,
                    'responses' => [],
                ],
                'photo' => null,
            ]
        );

        $response->assertStatus(201)
                 ->assertJson(['message' => 'Assignment created successfully']);

        $this->assertDatabaseHas('assignments', [
            'id' => $newAssignmentId,
            'kegiatan_statistik_id' => $activity->id,
            'ppl_id' => $ppl->id,
            'assignment_label' => 'Keluarga Baru Test',
            'status' => 'Assigned',
        ]);

        $this->assertDatabaseHas('assignment_responses', [
            'assignment_id' => $newAssignmentId,
            'user_id' => $ppl->id,
            'status' => 'Assigned',
        ]);
    }

    /** @test */
    public function ppl_cannot_create_new_assignment_for_disallowed_activity()
    {
        $ppl = User::factory()->create();
        $ppl->assignRole('PPL');

        $activity = KegiatanStatistik::factory()->create([
            'allow_new_assignments_from_pwa' => false,
        ]);
        $activity->members()->attach($ppl);

        $newAssignmentId = (string) Str::uuid();

        $response = $this->actingAs($ppl, 'sanctum')->postJson(
            "/api/activities/{$activity->id}/assignments/create",
            [
                'assignment' => [
                    'id' => $newAssignmentId,
                    'kegiatan_statistik_id' => $activity->id,
                    'ppl_id' => $ppl->id,
                    'assignment_label' => 'Keluarga Baru Test',
                    'status' => 'Assigned',
                ],
                'assignment_response' => [
                    'assignment_id' => $newAssignmentId,
                    'user_id' => $ppl->id,
                    'status' => 'Assigned',
                    'version' => 1,
                    'form_version_used' => 1,
                    'responses' => [],
                ],
            ]
        );

        $response->assertForbidden()
                 ->assertJson(['message' => 'This activity does not allow new assignments to be created from PWA.']);
    }

    /** @test */
    public function ppl_cannot_create_new_assignment_for_another_ppl()
    {
        $ppl = User::factory()->create();
        $ppl->assignRole('PPL');

        $otherPpl = User::factory()->create();
        $otherPpl->assignRole('PPL');

        $activity = KegiatanStatistik::factory()->create([
            'allow_new_assignments_from_pwa' => true,
        ]);
        $activity->members()->attach($ppl);
        $activity->members()->attach($otherPpl);

        $newAssignmentId = (string) Str::uuid();

        $response = $this->actingAs($ppl, 'sanctum')->postJson(
            "/api/activities/{$activity->id}/assignments/create",
            [
                'assignment' => [
                    'id' => $newAssignmentId,
                    'kegiatan_statistik_id' => $activity->id,
                    'ppl_id' => $otherPpl->id, // Trying to create for another PPL
                    'assignment_label' => 'Keluarga Baru Test',
                    'status' => 'Assigned',
                ],
                'assignment_response' => [
                    'assignment_id' => $newAssignmentId,
                    'user_id' => $otherPpl->id,
                    'status' => 'Assigned',
                    'version' => 1,
                    'form_version_used' => 1,
                    'responses' => [],
                ],
            ]
        );

        $response->assertForbidden()
                 ->assertJson(['message' => 'Unauthorized to create assignment for another PPL.']);
    }

    /** @test */
    public function unauthenticated_user_cannot_create_new_assignment()
    {
        $activity = KegiatanStatistik::factory()->create([
            'allow_new_assignments_from_pwa' => true,
        ]);

        $newAssignmentId = (string) Str::uuid();

        $response = $this->postJson(
            "/api/activities/{$activity->id}/assignments/create",
            [
                'assignment' => [
                    'id' => $newAssignmentId,
                    'kegiatan_statistik_id' => $activity->id,
                    'ppl_id' => (string) Str::uuid(),
                    'assignment_label' => 'Keluarga Baru Test',
                    'status' => 'Assigned',
                ],
                'assignment_response' => [
                    'assignment_id' => $newAssignmentId,
                    'user_id' => (string) Str::uuid(),
                    'status' => 'Assigned',
                    'version' => 1,
                    'form_version_used' => 1,
                    'responses' => [],
                ],
            ]
        );

        $response->assertUnauthorized();
    }

    /** @test */
    public function create_assignment_requires_validation()
    {
        $ppl = User::factory()->create();
        $ppl->assignRole('PPL');

        $activity = KegiatanStatistik::factory()->create([
            'allow_new_assignments_from_pwa' => true,
        ]);
        $activity->members()->attach($ppl);

        $response = $this->actingAs($ppl, 'sanctum')->postJson(
            "/api/activities/{$activity->id}/assignments/create",
            [
                'assignment' => [
                    // Missing required fields
                ],
                'assignment_response' => [
                    // Missing required fields
                ],
            ]
        );

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['assignment.id', 'assignment.kegiatan_statistik_id', 'assignment.ppl_id', 'assignment.assignment_label', 'assignment.status', 'assignment_response.assignment_id', 'assignment_response.user_id', 'assignment_response.status', 'assignment_response.version', 'assignment_response.form_version_used']);
    }

    /** @test */
    public function ppl_can_create_new_assignment_with_photo()
    {
        Storage::fake('public');

        $ppl = User::factory()->create();
        $ppl->assignRole('PPL');

        $activity = KegiatanStatistik::factory()->create([
            'allow_new_assignments_from_pwa' => true,
        ]);
        $activity->members()->attach($ppl);

        $newAssignmentId = (string) Str::uuid();
        $newAssignmentResponseId = (string) Str::uuid();

        // Create a dummy base64 image
        $base64Image = 'data:image/jpeg;base64,' . base64_encode(file_get_contents(__DIR__.'/test_image.jpg'));

        $response = $this->actingAs($ppl, 'sanctum')->postJson(
            "/api/activities/{$activity->id}/assignments/create",
            [
                'assignment' => [
                    'id' => $newAssignmentId,
                    'kegiatan_statistik_id' => $activity->id,
                    'ppl_id' => $ppl->id,
                    'pml_id' => null,
                    'assignment_label' => 'Keluarga Baru Foto Test',
                    'level_1_code' => '1',
                    'level_1_label' => 'Provinsi A',
                    'status' => 'Assigned',
                ],
                'assignment_response' => [
                    'assignment_id' => $newAssignmentId,
                    'user_id' => $ppl->id,
                    'status' => 'Assigned',
                    'version' => 1,
                    'form_version_used' => 1,
                    'responses' => [],
                ],
                'photo' => $base64Image,
            ]
        );

        $response->assertStatus(201)
                 ->assertJson(['message' => 'Assignment created successfully']);

        $this->assertDatabaseHas('assignments', [
            'id' => $newAssignmentId,
            'assignment_label' => 'Keluarga Baru Foto Test',
        ]);

        // Assert that the photo was stored
        $this->assertCount(1, Storage::disk('public')->files('assignments'));
        $this->assertDatabaseHas('assignment_attachments', [
            'assignment_id' => $newAssignmentId,
            'file_type' => 'photo',
        ]);
    }
}
