<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\KegiatanStatistik;
use App\Models\Assignment;
use App\Models\AssignmentResponse;
use Spatie\Permission\Models\Role;

class AssignmentStatusApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'PPL']);
        Role::firstOrCreate(['name' => 'PML']);
    }

    /** @test */
    public function pml_can_approve_assignment()
    {
        $pml = User::factory()->create();
        $pml->assignRole('PML');

        $ppl = User::factory()->create();
        $ppl->assignRole('PPL');

        $activity = KegiatanStatistik::factory()->create();
        $activity->members()->attach($pml);
        $activity->members()->attach($ppl);

        $assignment = Assignment::factory()->create([
            'kegiatan_statistik_id' => $activity->id,
            'pml_id' => $pml->id,
            'ppl_id' => $ppl->id,
        ]);

        $response = AssignmentResponse::factory()->create([
            'assignment_id' => $assignment->id,
            'status' => 'Submitted by PPL',
        ]);

        $this->actingAs($pml, 'sanctum')->postJson("/api/assignments/{$assignment->id}/status", [
            'status' => 'Approved by PML',
        ])->assertOk();

        $this->assertDatabaseHas('assignment_responses', [
            'assignment_id' => $assignment->id,
            'status' => 'Approved by PML',
        ]);
    }

    /** @test */
    public function pml_can_reject_assignment()
    {
        $pml = User::factory()->create();
        $pml->assignRole('PML');

        $ppl = User::factory()->create();
        $ppl->assignRole('PPL');

        $activity = KegiatanStatistik::factory()->create();
        $activity->members()->attach($pml);
        $activity->members()->attach($ppl);

        $assignment = Assignment::factory()->create([
            'kegiatan_statistik_id' => $activity->id,
            'pml_id' => $pml->id,
            'ppl_id' => $ppl->id,
        ]);

        $response = AssignmentResponse::factory()->create([
            'assignment_id' => $assignment->id,
            'status' => 'Submitted by PPL',
        ]);

        $this->actingAs($pml, 'sanctum')->postJson("/api/assignments/{$assignment->id}/status", [
            'status' => 'Rejected by PML',
            'notes' => 'This is a rejection note.',
        ])->assertOk();

        $this->assertDatabaseHas('assignment_responses', [
            'assignment_id' => $assignment->id,
            'status' => 'Rejected by PML',
            'notes' => 'This is a rejection note.',
        ]);
    }

    /** @test */
    public function ppl_cannot_update_status()
    {
        $ppl = User::factory()->create();
        $ppl->assignRole('PPL');

        $activity = KegiatanStatistik::factory()->create();
        $activity->members()->attach($ppl);

        $assignment = Assignment::factory()->create([
            'kegiatan_statistik_id' => $activity->id,
            'ppl_id' => $ppl->id,
        ]);

        $response = AssignmentResponse::factory()->create([
            'assignment_id' => $assignment->id,
            'status' => 'Submitted by PPL',
        ]);

        $this->actingAs($ppl, 'sanctum')->postJson("/api/assignments/{$assignment->id}/status", [
            'status' => 'Approved by PML',
        ])->assertForbidden();
    }

    /** @test */
    public function pml_cannot_update_status_of_unrelated_assignment()
    {
        $pml = User::factory()->create();
        $pml->assignRole('PML');

        $other_pml = User::factory()->create();
        $other_pml->assignRole('PML');

        $activity = KegiatanStatistik::factory()->create();
        $activity->members()->attach($other_pml);

        $assignment = Assignment::factory()->create([
            'kegiatan_statistik_id' => $activity->id,
            'pml_id' => $other_pml->id,
        ]);

        $response = AssignmentResponse::factory()->create([
            'assignment_id' => $assignment->id,
            'status' => 'Submitted by PPL',
        ]);

        $this->actingAs($pml, 'sanctum')->postJson("/api/assignments/{$assignment->id}/status", [
            'status' => 'Approved by PML',
        ])->assertForbidden();
    }

    /** @test */
    public function unauthenticated_user_cannot_update_status()
    {
        $assignment = Assignment::factory()->create();

        $response = AssignmentResponse::factory()->create([
            'assignment_id' => $assignment->id,
            'status' => 'Submitted by PPL',
        ]);

        $this->postJson("/api/assignments/{$assignment->id}/status", [
            'status' => 'Approved by PML',
        ])->assertUnauthorized();
    }

    /** @test */
    public function pml_can_get_allowed_actions_for_submitted_assignment()
    {
        $pml = User::factory()->create();
        $pml->assignRole('PML');

        $activity = KegiatanStatistik::factory()->create();
        $activity->members()->attach($pml);

        $assignment = Assignment::factory()->create([
            'kegiatan_statistik_id' => $activity->id,
            'pml_id' => $pml->id,
        ]);

        AssignmentResponse::factory()->create([
            'assignment_id' => $assignment->id,
            'status' => 'Submitted by PPL',
        ]);

        $response = $this->actingAs($pml, 'sanctum')->getJson("/api/assignments/{$assignment->id}/allowed-actions");

        $response->assertOk()
                 ->assertJson(['APPROVE', 'REJECT']);
    }

    /** @test */
    public function pml_cannot_get_allowed_actions_for_unsubmitted_assignment()
    {
        $pml = User::factory()->create();
        $pml->assignRole('PML');

        $activity = KegiatanStatistik::factory()->create();
        $activity->members()->attach($pml);

        $assignment = Assignment::factory()->create([
            'kegiatan_statistik_id' => $activity->id,
            'pml_id' => $pml->id,
        ]);

        AssignmentResponse::factory()->create([
            'assignment_id' => $assignment->id,
            'status' => 'Opened',
        ]);

        $response = $this->actingAs($pml, 'sanctum')->getJson("/api/assignments/{$assignment->id}/allowed-actions");

        $response->assertOk()
                 ->assertJson([]);
    }

    /** @test */
    public function ppl_cannot_get_allowed_actions()
    {
        $ppl = User::factory()->create();
        $ppl->assignRole('PPL');

        $activity = KegiatanStatistik::factory()->create();
        $activity->members()->attach($ppl);

        $assignment = Assignment::factory()->create([
            'kegiatan_statistik_id' => $activity->id,
            'ppl_id' => $ppl->id,
        ]);

        AssignmentResponse::factory()->create([
            'assignment_id' => $assignment->id,
            'status' => 'Submitted by PPL',
        ]);

        $response = $this->actingAs($ppl, 'sanctum')->getJson("/api/assignments/{$assignment->id}/allowed-actions");

        $response->assertForbidden();
    }

    /** @test */
    public function unauthenticated_user_cannot_get_allowed_actions()
    {
        $assignment = Assignment::factory()->create();

        AssignmentResponse::factory()->create([
            'assignment_id' => $assignment->id,
            'status' => 'Submitted by PPL',
        ]);

        $response = $this->getJson("/api/assignments/{$assignment->id}/allowed-actions");

        $response->assertUnauthorized();
    }

    /** @test */
    public function pml_can_revert_approved_assignment()
    {
        $pml = User::factory()->create();
        $pml->assignRole('PML');

        $ppl = User::factory()->create();
        $ppl->assignRole('PPL');

        $activity = KegiatanStatistik::factory()->create();
        $activity->members()->attach($pml);
        $activity->members()->attach($ppl);

        $assignment = Assignment::factory()->create([
            'kegiatan_statistik_id' => $activity->id,
            'pml_id' => $pml->id,
            'ppl_id' => $ppl->id,
        ]);

        AssignmentResponse::factory()->create([
            'assignment_id' => $assignment->id,
            'status' => 'Approved by PML',
        ]);

        $this->actingAs($pml, 'sanctum')->postJson("/api/assignments/{$assignment->id}/status", [
            'status' => 'Submitted by PPL',
            'notes' => 'Accidental approval, reverting.',
        ])->assertOk();

        $this->assertDatabaseHas('assignment_responses', [
            'assignment_id' => $assignment->id,
            'status' => 'Submitted by PPL',
            'notes' => 'Accidental approval, reverting.',
        ]);
    }

    /** @test */
    public function pml_cannot_revert_unapproved_or_rejected_assignment()
    {
        $pml = User::factory()->create();
        $pml->assignRole('PML');

        $activity = KegiatanStatistik::factory()->create();
        $activity->members()->attach($pml);

        $assignment = Assignment::factory()->create([
            'kegiatan_statistik_id' => $activity->id,
            'pml_id' => $pml->id,
        ]);

        // Test with 'Submitted by PPL' status
        AssignmentResponse::factory()->create([
            'assignment_id' => $assignment->id,
            'status' => 'Submitted by PPL',
        ]);

        $this->actingAs($pml, 'sanctum')->postJson("/api/assignments/{$assignment->id}/status", [
            'status' => 'Submitted by PPL',
            'notes' => 'Attempting to revert unapproved.',
        ])->assertForbidden();

        // Test with 'Rejected by PML' status
        AssignmentResponse::where('assignment_id', $assignment->id)->update([
            'status' => 'Rejected by PML',
        ]);

        $this->actingAs($pml, 'sanctum')->postJson("/api/assignments/{$assignment->id}/status", [
            'status' => 'Submitted by PPL',
            'notes' => 'Attempting to revert rejected.',
        ])->assertForbidden();
    }

    /** @test */
    public function ppl_cannot_revert_approved_assignment()
    {
        $ppl = User::factory()->create();
        $ppl->assignRole('PPL');

        $pml = User::factory()->create();
        $pml->assignRole('PML');

        $activity = KegiatanStatistik::factory()->create();
        $activity->members()->attach($ppl);
        $activity->members()->attach($pml);

        $assignment = Assignment::factory()->create([
            'kegiatan_statistik_id' => $activity->id,
            'ppl_id' => $ppl->id,
            'pml_id' => $pml->id,
        ]);

        AssignmentResponse::factory()->create([
            'assignment_id' => $assignment->id,
            'status' => 'Approved by PML',
        ]);

        $this->actingAs($ppl, 'sanctum')->postJson("/api/assignments/{$assignment->id}/status", [
            'status' => 'Submitted by PPL',
        ])->assertForbidden();
    }

    /** @test */
    public function unauthenticated_user_cannot_revert_approved_assignment()
    {
        $assignment = Assignment::factory()->create();

        AssignmentResponse::factory()->create([
            'assignment_id' => $assignment->id,
            'status' => 'Approved by PML',
        ]);

        $this->postJson("/api/assignments/{$assignment->id}/status", [
            'status' => 'Submitted by PPL',
        ])->assertUnauthorized();
    }
}
