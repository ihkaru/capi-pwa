<?php

namespace Tests\Unit;

use App\Models\Assignment;
use App\Models\AssignmentResponse;
use App\Models\KegiatanStatistik;
use App\Models\Satker;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AssignmentResponseTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test that the responses attribute is automatically cast to an array/object.
     *
     * @return void
     */
    public function test_responses_attribute_is_cast_correctly(): void
    {
        // 1. Arrange
        // We need a few prerequisite models to create an assignment response
        $satker = Satker::factory()->create();
        $kegiatan = KegiatanStatistik::factory()->create();
        $user = User::factory()->for($satker)->create();
        $assignment = Assignment::factory()->for($kegiatan)->for($satker)->for($user, 'ppl')->for($user, 'pml')->create();

        $responseData = [
            'nama_krt' => 'Budi Santoso',
            'jumlah_art' => 5,
            'details' => [
                'is_verified' => true,
                'tags' => ['tag1', 'tag2']
            ]
        ];

        // 2. Act
        // Create the AssignmentResponse, passing a raw PHP array to the 'responses' attribute
        AssignmentResponse::create([
            'assignment_id' => $assignment->id,
            'status' => 'Assigned',
            'responses' => $responseData,
            'form_version_used' => 1,
        ]);

        // Retrieve the model from the database
        $retrievedResponse = AssignmentResponse::find($assignment->id);

        // 3. Assert
        // Check that the retrieved 'responses' attribute is a PHP array
        $this->assertIsArray($retrievedResponse->responses);

        // Check that the values within the array are correct
        $this->assertEquals('Budi Santoso', $retrievedResponse->responses['nama_krt']);
        $this->assertEquals(5, $retrievedResponse->responses['jumlah_art']);
        $this->assertTrue($retrievedResponse->responses['details']['is_verified']);
        $this->assertEquals(['tag1', 'tag2'], $retrievedResponse->responses['details']['tags']);
    }
}
