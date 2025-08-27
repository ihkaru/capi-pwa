<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Satker;

class SatkerSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create specific Satkers for the case study
        Satker::firstOrCreate(
            ['code' => '6100'],
            ['name' => 'BPS Provinsi Kalimantan Barat']
        );

        Satker::firstOrCreate(
            ['code' => '6104'],
            ['name' => 'BPS Kabupaten Mempawah']
        );
    }
}
