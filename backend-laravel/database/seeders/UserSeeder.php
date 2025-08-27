<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Satker;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Constants;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get Satkers
        $satkerProv = Satker::where('code', '6100')->first();
        $satkerMempawah = Satker::where('code', '6104')->first();

        if (!$satkerMempawah || !$satkerProv) {
            $this->command->error('Satker BPS Provinsi Kalbar (6100) or BPS Kab Mempawah (6102) not found. Please run SatkerSeeder first.');
            return;
        }

        // 1. Super Admin (Global)
        $superAdmin = User::firstOrCreate(
            ['email' => 'superadmin@bps.go.id'],
            [
                'name' => 'Super Admin',
                'password' => Hash::make('password'),
                'satker_id' => null, // Super Admin is not tied to a specific Satker
            ]
        );
        $superAdmin->assignRole(Constants::ROLE_SUPER_ADMIN);

        // 2. Admin Satker for BPS Provinsi Kalbar
        $adminSatkerProv = User::firstOrCreate(
            ['email' => 'admin.kalbar@bps.go.id'],
            [
                'name' => 'Admin Satker Kalbar',
                'password' => Hash::make('password'),
                'satker_id' => $satkerProv->id,
            ]
        );
        $adminSatkerProv->assignRole(Constants::ROLE_ADMIN_SATKER);

        // 3. Admin Kegiatan for BPS Kabupaten Mempawah
        $adminKegiatanMpw = User::firstOrCreate(
            ['email' => 'admin.mempawah@bps.go.id'],
            [
                'name' => 'Admin Kegiatan Mempawah',
                'password' => Hash::make('password'),
                'satker_id' => $satkerMempawah->id,
            ]
        );
        $adminKegiatanMpw->assignRole(Constants::ROLE_ADMIN_KEGIATAN);

        // 4. Create 2 PMLs for Mempawah
        for ($i = 1; $i <= 2; $i++) {
            $pml = User::firstOrCreate(
                ['email' => "pml0{$i}.mempawah@bps.go.id"],
                [
                    'name' => "PML {$i} Mempawah",
                    'password' => Hash::make('password'),
                    'satker_id' => $satkerMempawah->id,
                ]
            );
            $pml->assignRole(Constants::ROLE_PML);
        }

        // 5. Create 10 PPLs for Mempawah
        for ($i = 1; $i <= 10; $i++) {
            $ppl = User::firstOrCreate(
                ['email' => "ppl" . str_pad($i, 2, '0', STR_PAD_LEFT) . ".mempawah@bps.go.id"],
                [
                    'name' => "PPL {$i} Mempawah",
                    'password' => Hash::make('password'),
                    'satker_id' => $satkerMempawah->id,
                ]
            );
            $ppl->assignRole(Constants::ROLE_PPL);
        }
        $pml = User::firstOrCreate(
            ['email' => "ihza2karunia@gmail.com"],
            [
                'name' => "Ihza PML",
                'password' => Hash::make('password'),
                'satker_id' => $satkerMempawah->id,
            ]
        );
        $pml->assignRole(Constants::ROLE_PML);
        $ppl = User::firstOrCreate(
            ['email' => "ihzathegodslayer@gmail.com"],
            [
                'name' => "Ihza PPL",
                'password' => Hash::make('password'),
                'satker_id' => $satkerMempawah->id,
            ]
        );
        $ppl->assignRole(Constants::ROLE_PPL);
    }
}
