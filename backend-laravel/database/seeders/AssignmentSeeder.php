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
        $satkerMempawah = Satker::where('code', '6104')->first();
        if (!$satkerMempawah) {
            $this->command->error('Satker Mempawah (6104) not found.');
            return;
        }

        $pmlUsers = User::role(Constants::ROLE_PML)->where('satker_id', $satkerMempawah->id)->get();
        $pplUsers = User::role(Constants::ROLE_PPL)->where('satker_id', $satkerMempawah->id)->get();

        if ($pmlUsers->isEmpty() || $pplUsers->isEmpty()) {
            $this->command->error('PML or PPL users for Satker Mempawah not found.');
            return;
        }

        $slsMempawah = MasterSls::where('kabkot_id', '6104')->inRandomOrder()->limit(50)->get();

        if ($slsMempawah->isEmpty()) {
            $this->command->error('No SLS data found for Mempawah (kabkot_id: 6104). Cannot create assignments.');
            return;
        }

        $this->seedAssignmentsForKegiatan('REGSOSEK 2022 - LISTING', $satkerMempawah, $pplUsers, $pmlUsers, $slsMempawah, $faker);
        $this->seedAssignmentsForKegiatan('REGSOSEK 2022 - PENDATAAN', $satkerMempawah, $pplUsers, $pmlUsers, $slsMempawah, $faker);
    }

    private function seedAssignmentsForKegiatan($kegiatanName, $satker, $pplUsers, $pmlUsers, $slsCollection, $faker)
    {
        $kegiatan = KegiatanStatistik::where('name', $kegiatanName)->first();
        if (!$kegiatan) {
            $this->command->error("Kegiatan \"{$kegiatanName}\" not found.");
            return;
        }

        $pplIndex = 0;
        $pmlIndex = 0;

        foreach ($slsCollection as $sls) {
            $ppl = $pplUsers[$pplIndex];
            $pml = $pmlUsers[$pmlIndex];

            $prefilled_data = $kegiatanName === 'REGSOSEK 2022 - PENDATAAN'
                ? ['nama_krt' => $faker->name, 'alamat' => $faker->address]
                : ['sls_name' => $sls->nama];

            $assignment = Assignment::create([
                'satker_id' => $satker->id,
                'kegiatan_statistik_id' => $kegiatan->id,
                'ppl_id' => $ppl->id,
                'pml_id' => $pml->id,
                'level_1_code' => $sls->prov_id,
                'level_2_code' => substr($sls->kabkot_id, -2),
                'level_3_code' => substr($sls->kec_id, -3),
                'level_4_code' => substr($sls->desa_kel_id, -3),
                'level_5_code' => substr($sls->sls_id, -4),
                'level_6_code' => '00',
                "level_1_label" => $sls->provinsi,
                "level_2_label" => $sls->kabkot,
                "level_3_label" => $sls->kecamatan,
                "level_4_label" => $sls->desa_kel,
                "level_5_label" => $sls->nama,
                "level_6_label" => $sls->nama,
                'assignment_label' => $faker->name(),
                'prefilled_data' => json_encode($prefilled_data),
                'level_4_code_full' => $sls->prov_id . substr($sls->kabkot_id, -2) . substr($sls->kec_id, -3) . substr($sls->desa_kel_id, -3),
                'level_6_code_full' => $sls->prov_id . substr($sls->kabkot_id, -2) . substr($sls->kec_id, -3) . substr($sls->desa_kel_id, -3) . substr($sls->sls_id, -4) . "00",
            ]);

            $assignmentResponseData = [
                'assignment_id' => $assignment->id,
                'form_version_used' => $kegiatan->form_version,
            ];

            if ($kegiatanName === 'REGSOSEK 2022 - LISTING') {
                $responses = [
                    'nama_krt' => $faker->name,
                    'alamat' => $faker->address,
                    'jumlah_art' => $faker->numberBetween(1, 10),
                    'foto_rumah' => 'dummy_photo_path_' . uniqid() . '.jpg', // Placeholder
                    'geotag_rumah' => [
                        'latitude' => $faker->latitude,
                        'longitude' => $faker->longitude,
                        'accuracy' => $faker->numberBetween(5, 50),
                        'timestamp' => now()->toISOString(),
                    ],
                ];
                $assignmentResponseData['responses'] = $responses;

                // Randomly set some to Submitted by PPL
                if ($faker->boolean(70)) { // 70% chance to be submitted
                    $assignmentResponseData['status'] = Constants::STATUS_SUBMITTED_PPL;
                } else {
                    $assignmentResponseData['status'] = Constants::STATUS_ASSIGNED;
                }
            } else {
                $assignmentResponseData['status'] = Constants::STATUS_ASSIGNED;
                $assignmentResponseData['responses'] = json_encode([]);
            }

            AssignmentResponse::create($assignmentResponseData);

            $pplIndex = ($pplIndex + 1) % $pplUsers->count();
            if ($pplIndex % 5 === 0) {
                $pmlIndex = ($pmlIndex + 1) % $pmlUsers->count();
            }
        }

        $this->command->info("Successfully created " . $slsCollection->count() . " assignments for {$kegiatanName} in {$satker->name}.");
    }
}
