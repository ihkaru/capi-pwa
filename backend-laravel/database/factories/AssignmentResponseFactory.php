<?php

namespace Database\Factories;

use App\Constants;
use App\Models\Assignment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\AssignmentResponse>
 */
class AssignmentResponseFactory extends Factory
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
            'status' => $this->faker->randomElement(Constants::getResponseStatuses()),
            'version' => 1,
            'form_version_used' => 1,
            'responses' => json_encode(['answer1' => $this->faker->sentence()]),
        ];
    }
}