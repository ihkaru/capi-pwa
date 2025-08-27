<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\MasterData;

class MasterDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        MasterData::firstOrCreate(
            ['type' => 'KBLI', 'version' => 2020],
            [
                'description' => 'Klasifikasi Baku Lapangan Usaha Indonesia 2020',
                'data' => json_encode([
                    ['code' => '01110', 'name' => 'Penanaman Padi'],
                    ['code' => '01120', 'name' => 'Penanaman Jagung'],
                    // ... more KBLI data
                ]),
                'is_active' => true,
            ]
        );

        MasterData::firstOrCreate(
            ['type' => 'WILAYAH_INDONESIA', 'version' => 1],
            [
                'description' => 'Data Wilayah Administrasi Indonesia',
                'data' => json_encode([
                    ['code' => '61', 'name' => 'KALIMANTAN BARAT', 'level' => 1],
                    ['code' => '6102', 'name' => 'KABUPATEN MEMPAWAH', 'level' => 2],
                    // ... more wilayah data
                ]),
                'is_active' => true,
            ]
        );
    }
}
