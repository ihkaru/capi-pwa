<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\MasterData; // Make sure to import the model

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\MasterData>
 */
class MasterDataFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'type' => $this->faker->word(),
            'version' => $this->faker->numberBetween(1, 10),
            'description' => $this->faker->sentence(),
            'data' => json_encode([
                'item1' => $this->faker->word(),
                'item2' => $this->faker->word(),
            ]),
            'is_active' => true,
        ];
    }
}
