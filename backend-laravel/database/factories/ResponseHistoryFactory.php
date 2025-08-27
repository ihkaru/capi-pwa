<?php

namespace Database\Factories;

use App\Constants;
use App\Models\AssignmentResponse;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ResponseHistory>
 */
class ResponseHistoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $statuses = Constants::getResponseStatuses();

        return [
            'assignment_response_id' => AssignmentResponse::factory(),
            'user_id' => User::factory(),
            'from_status' => $this->faker->randomElement($statuses),
            'to_status' => $this->faker->randomElement($statuses),
            'notes' => $this->faker->sentence(),
        ];
    }
}