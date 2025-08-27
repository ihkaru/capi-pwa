<?php

namespace Database\Seeders;

use App\Models\Assignment;
use App\Models\AssignmentResponse;
use App\Models\User;
use App\Models\KegiatanStatistik;
use App\Models\MasterSls;
use App\Models\Satker;
use Faker\Factory as Faker;
use Illuminate\Database\Seeder;
use App\Constants;

class AssignmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $faker = Faker::create('id_ID');
        // 1. Get the context: Satker, Kegiatan, Users, and SLS data
        $satkerMempawah = Satker::where('code', '6104')->first();
        if (!$satkerMempawah) {
            $this->command->error('Satker Mempawah (6104) not found.');
            return;
        }

        $kegiatanListing = KegiatanStatistik::where('name', 'REGSOSEK 2022 - LISTING')->first();
        if (!$kegiatanListing) {
            $this->command->error('Kegiatan "REGSOSEK 2022 - LISTING" not found.');
            return;
        }

        $pmlUsers = User::role(Constants::ROLE_PML)->where('satker_id', $satkerMempawah->id)->get();
        $pplUsers = User::role(Constants::ROLE_PPL)->where('satker_id', $satkerMempawah->id)->get();

        if ($pmlUsers->isEmpty() || $pplUsers->isEmpty()) {
            $this->command->error('PML or PPL users for Satker Mempawah not found.');
            return;
        }

        // 2. Get 50 SLS from Mempawah to create assignments from
        $slsMempawah = MasterSls::where('kabkot_id', '6104')->inRandomOrder()->limit(50)->get();

        if ($slsMempawah->count() < 50) {
            $this->command->warn('Could not find 50 SLS for Mempawah (6104). Found ' . $slsMempawah->count() . '. Continuing with what was found.');
        }

        if ($slsMempawah->isEmpty()) {
            $this->command->error('No SLS data found for Mempawah (kabkot_id: 6104). Cannot create assignments.');
            return;
        }

        // 3. Loop through SLS data and create assignments, distributing them among PPL/PML
        $pplIndex = 0;
        $pmlIndex = 0;

        foreach ($slsMempawah as $sls) {
            $ppl = $pplUsers[$pplIndex];
            $pml = $pmlUsers[$pmlIndex];

            $assignment = Assignment::create([
                'satker_id' => $satkerMempawah->id,
                'kegiatan_statistik_id' => $kegiatanListing->id,
                'ppl_id' => $ppl->id,
                'pml_id' => $pml->id,
                // --- CODES ---
                'level_1_code' => $sls->prov_id,
                'level_2_code' => substr($sls->sls_id, -2),
                'level_3_code' => substr($sls->sls_id, -3),
                'level_4_code' => substr($sls->sls_id, -3),
                'level_5_code' => substr($sls->sls_id, -4),
                'level_6_code' => '00',
                // --- LABELS ---
                'level_1_label' => $sls->provinsi,
                'level_2_label' => $sls->kabkot,
                'level_3_label' => $sls->kecamatan,
                'level_4_label' => $sls->desa_kel,
                'level_5_label' => $sls->nama, // Nama SLS/RT
                'level_6_label' => $sls->nama, // Nama Sub-SLS/RT, sama karena tidak ada pecahan
                // --- OTHER ---
                'assignment_label' => $faker->name(),
                'prefilled_data' => json_encode(['sls_name' => $sls->nama]),
                'level_4_code_full' => $sls->prov_id . substr($sls->sls_id, -2) . substr($sls->sls_id, -3) . substr($sls->sls_id, -3),
                'level_6_code_full' => $sls->prov_id . substr($sls->sls_id, -2) . substr($sls->sls_id, -3) . substr($sls->sls_id, -3) . substr($sls->sls_id, -4) . "00",
            ]);

            // Create a corresponding empty response
            AssignmentResponse::create([
                'assignment_id' => $assignment->id,
                'status' => Constants::STATUS_ASSIGNED,
                'form_version_used' => $kegiatanListing->form_version,
                'responses' => json_encode([]),
            ]);

            // Cycle through PPLs and PMLs
            $pplIndex = ($pplIndex + 1) % $pplUsers->count();
            // Assign a new PML for every 5 PPLs (integer division)
            if ($pplIndex % 5 === 0) {
                $pmlIndex = ($pmlIndex + 1) % $pmlUsers->count();
            }
        }

        $this->command->info("Successfully created " . $slsMempawah->count() . " assignments for Regsosek Listing in Mempawah.");
    }
}
