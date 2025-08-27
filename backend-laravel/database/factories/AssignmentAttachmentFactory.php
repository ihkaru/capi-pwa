<?php

namespace Database\Factories;

use App\Models\Assignment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\AssignmentAttachment>
 */
class AssignmentAttachmentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'assignment_id' => Assignment::factory(),
            'original_filename' => $this->faker->word() . '.jpg',
            'stored_path' => 'attachments/' . $this->faker->uuid() . '.jpg',
            'mime_type' => 'image/jpeg',
            'file_size_bytes' => $this->faker->numberBetween(100000, 5000000),
        ];
    }
}