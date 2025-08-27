<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\KegiatanStatistik;
use Carbon\Carbon;

class KegiatanStatistikSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $formSchemaTemplate = json_encode([
            "masters_used" => [
                ["type" => "KBLI", "version" => 2020],
                ["type" => "WILAYAH_INDONESIA", "version" => 1],
            ],
            "level_definitions" => new \stdClass(),
            "assignment_table_grouping_levels" => [],
            "assignment_table_columns" => [],
            "pages" => []
        ], JSON_PRETTY_PRINT);

        // Create specific activities for the case study
        KegiatanStatistik::firstOrCreate(
            ['name' => 'REGSOSEK 2022 - LISTING'],
            [
                'year' => 2022,
                'start_date' => Carbon::create(2022, 10, 15),
                'end_date' => Carbon::create(2022, 11, 14),
                'form_schema' => $formSchemaTemplate,
                'form_version' => 1,
            ]
        );

        KegiatanStatistik::firstOrCreate(
            ['name' => 'REGSOSEK 2022 - PENDATAAN'],
            [
                'year' => 2022,
                'start_date' => Carbon::create(2022, 10, 15),
                'end_date' => Carbon::create(2022, 11, 14),
                'form_schema' => $formSchemaTemplate,
                'form_version' => 1,
            ]
        );
    }
}