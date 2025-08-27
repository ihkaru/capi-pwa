<?php

namespace Database\Seeders;

use App\Models\KegiatanStatistik;
use App\Models\Satker;
use Illuminate\Database\Seeder;

class KegiatanSatkerSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get the specific Satker and KegiatanStatistik
        $satkerMempawah = Satker::where('code', '6104')->first();
        $regsosekListing = KegiatanStatistik::where('name', 'REGSOSEK 2022 - LISTING')->first();
        $regsosekPendataan = KegiatanStatistik::where('name', 'REGSOSEK 2022 - PENDATAAN')->first();

        if (!$satkerMempawah || !$regsosekListing || !$regsosekPendataan) {
            $this->command->error('Required Satker or KegiatanStatistik not found. Please run SatkerSeeder and KegiatanStatistikSeeder first.');
            return;
        }

        // Attach the Mempawah Satker to both Regsosek activities
        $regsosekListing->satkers()->syncWithoutDetaching([$satkerMempawah->id]);
        $regsosekPendataan->satkers()->syncWithoutDetaching([$satkerMempawah->id]);
    }
}
