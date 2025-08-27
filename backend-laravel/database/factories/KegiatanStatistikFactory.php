<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\KegiatanStatistik>
 */
class KegiatanStatistikFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => 'Sensus ' . $this->faker->word(),
            'year' => $this->faker->year(),
            'start_date' => $this->faker->date(),
            'end_date' => $this->faker->date(),
            'form_schema' => json_encode(['field1' => 'text', 'field2' => 'number']),
        ];
    }
}