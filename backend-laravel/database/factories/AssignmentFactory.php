<?php

namespace Database\Factories;

use App\Models\KegiatanStatistik;
use App\Models\Satker;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Assignment>
 */
class AssignmentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $level1 = $this->faker->numerify('##');
        $level2 = $this->faker->numerify('##');
        $level3 = $this->faker->numerify('###');
        $level4 = $this->faker->numerify('###');
        $level5 = $this->faker->numerify('####');
        $level6 = $this->faker->numerify('#');

        return [
            'satker_id' => Satker::factory(),
            'kegiatan_statistik_id' => KegiatanStatistik::factory(),
            'ppl_id' => User::factory(),
            'pml_id' => User::factory(),
            'level_1_code' => $level1,
            'level_2_code' => $level2,
            'level_3_code' => $level3,
            'level_4_code' => $level4,
            'level_5_code' => $level5,
            'level_6_code' => $level6,
            'level_4_code_full' => "{$level1}{$level2}{$level3}{$level4}",
            'level_6_code_full' => "{$level1}{$level2}{$level3}{$level4}{$level5}{$level6}",
            'assignment_label' => $this->faker->sentence(3),
        ];
    }
}