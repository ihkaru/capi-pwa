<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\KegiatanStatistik;
use Carbon\Carbon;
use Illuminate\Support\Facades\File;

class KegiatanStatistikSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Load the detailed schema for REGSOSEK 2022 - LISTING from the frontend dev-data
        $listingSchemaPath = base_path('../frontend-pwa/public/dev-data/regsosek-listing-schema.json');
        $listingSchemaJson = File::get($listingSchemaPath);

        // Load the detailed schema for REGSOSEK 2022 - PENDATAAN
        $pendataanSchemaPath = base_path('../frontend-pwa/public/dev-data/regsosek-pendataan-schema.json');
        $pendataanSchemaJson = File::get($pendataanSchemaPath);

        // Create specific activities for the case study
        KegiatanStatistik::firstOrCreate(
            ['name' => 'REGSOSEK 2022 - LISTING'],
            [
                'year' => 2022,
                'start_date' => Carbon::create(2022, 10, 15),
                'end_date' => Carbon::create(2022, 11, 14),
                'form_schema' => json_decode($listingSchemaJson, true),
                'form_version' => 1,
            ]
        );

        KegiatanStatistik::firstOrCreate(
            ['name' => 'REGSOSEK 2022 - PENDATAAN'],
            [
                'year' => 2022,
                'start_date' => Carbon::create(2022, 10, 15),
                'end_date' => Carbon::create(2022, 11, 14),
                'form_schema' => json_decode($pendataanSchemaJson, true),
                'form_version' => 1,
            ]
        );
    }
}