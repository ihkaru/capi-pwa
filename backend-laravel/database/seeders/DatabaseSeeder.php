<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use App\Constants;
use App\Models\KegiatanStatistik;
use App\Models\User;
use Database\Seeders\MasterDataSeeder; // ADDED THIS LINE

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Create roles from constants to ensure consistency
        Role::firstOrCreate(['name' => Constants::ROLE_SUPER_ADMIN]);
        Role::firstOrCreate(['name' => Constants::ROLE_ADMIN_SATKER]);
        Role::firstOrCreate(['name' => Constants::ROLE_ADMIN_KEGIATAN]);
        Role::firstOrCreate(['name' => Constants::ROLE_PML]);
        Role::firstOrCreate(['name' => Constants::ROLE_PPL]);

        // The seeder order is crucial for data integrity.
        $this->call([
            SatkerSeeder::class,
            UserSeeder::class,
            KegiatanStatistikSeeder::class,
            KegiatanSatkerSeeder::class,
            MasterDataSeeder::class, // ADD THIS LINE
            MasterSlsSeeder::class,
            AssignmentSeeder::class,
        ]);

        // Link users to activities for PWA testing
        $pmlUser = User::where('email', 'admin.mempawah@bps.go.id')->first(); // Example PML user from UserSeeder
        $pplUser = User::where('email', 'ppl01.mempawah@bps.go.id')->first(); // Example PPL user from UserSeeder

        $regsosekListing = KegiatanStatistik::where('name', 'REGSOSEK 2022 - LISTING')->first();
        $regsosekPendataan = KegiatanStatistik::where('name', 'REGSOSEK 2022 - PENDATAAN')->first();
        $this->command->info('DatabaseSeeder: Found REGSOSEK LISTING: ' . ($regsosekListing ? $regsosekListing->name : 'Not Found'));
        $this->command->info('DatabaseSeeder: Found REGSOSEK PENDATAAN: ' . ($regsosekPendataan ? $regsosekPendataan->name : 'Not Found'));

        if ($pmlUser && $regsosekListing) {
            if (!$pmlUser->kegiatanStatistiks()->where('kegiatan_statistik_id', $regsosekListing->id)->exists()) {
                $pmlUser->kegiatanStatistiks()->attach($regsosekListing->id);
                $pmlUser->assignRole(Constants::ROLE_PML); // Ensure role is assigned
                $this->command->info('PML user attached to REGSOSEK 2022 - LISTING.');
            }
        }
        if ($pplUser && $regsosekListing) {
            if (!$pplUser->kegiatanStatistiks()->where('kegiatan_statistik_id', $regsosekListing->id)->exists()) {
                $pplUser->kegiatanStatistiks()->attach($regsosekListing->id);
                $pplUser->assignRole(Constants::ROLE_PPL); // Ensure role is assigned
                $this->command->info('PPL user attached to REGSOSEK 2022 - LISTING.');
            }
        }
        if ($pmlUser && $regsosekPendataan) {
            if (!$pmlUser->kegiatanStatistiks()->where('kegiatan_statistik_id', $regsosekPendataan->id)->exists()) {
                $pmlUser->kegiatanStatistiks()->attach($regsosekPendataan->id);
                $pmlUser->assignRole(Constants::ROLE_PML); // Ensure role is assigned
                $this->command->info('PML user attached to REGSOSEK 2022 - PENDATAAN.');
            }
        }
        if ($pplUser && $regsosekPendataan) {
            if (!$pplUser->kegiatanStatistiks()->where('kegiatan_statistik_id', $regsosekPendataan->id)->exists()) {
                $pplUser->kegiatanStatistiks()->attach($regsosekPendataan->id);
                $pplUser->assignRole(Constants::ROLE_PPL); // Ensure role is assigned
                $this->command->info('PPL user attached to REGSOSEK 2022 - PENDATAAN.');
            }
        }

        // NEW: Linking logic for ihza2karunia@gmail.com (PML) and ihzathegodslayer@gmail.com (PPL)
        $ihzaPmlUser = User::where('email', 'ihza2karunia@gmail.com')->first();
        $ihzaPplUser = User::where('email', 'ihzathegodslayer@gmail.com')->first();
        $this->command->info('DatabaseSeeder: Found Ihza PML user: ' . ($ihzaPmlUser ? $ihzaPmlUser->email : 'Not Found'));
        $this->command->info('DatabaseSeeder: Found Ihza PPL user: ' . ($ihzaPplUser ? $ihzaPplUser->email : 'Not Found'));

        if ($ihzaPmlUser && $regsosekListing) {
            if (!$ihzaPmlUser->kegiatanStatistiks()->where('kegiatan_statistik_id', $regsosekListing->id)->exists()) {
                $ihzaPmlUser->kegiatanStatistiks()->attach($regsosekListing->id);
                $ihzaPmlUser->assignRole(Constants::ROLE_PML);
                $this->command->info('Ihza PML user attached to REGSOSEK 2022 - LISTING.');
            }
        }
        if ($ihzaPplUser && $regsosekListing) {
            if (!$ihzaPplUser->kegiatanStatistiks()->where('kegiatan_statistik_id', $regsosekListing->id)->exists()) {
                $ihzaPplUser->kegiatanStatistiks()->attach($regsosekListing->id);
                $ihzaPplUser->assignRole(Constants::ROLE_PPL);
                $this->command->info('Ihza PPL user attached to REGSOSEK 2022 - LISTING.');
            }
        }
        if ($ihzaPmlUser && $regsosekPendataan) {
            if (!$ihzaPmlUser->kegiatanStatistiks()->where('kegiatan_statistik_id', $regsosekPendataan->id)->exists()) {
                $ihzaPmlUser->kegiatanStatistiks()->attach($regsosekPendataan->id);
                $ihzaPmlUser->assignRole(Constants::ROLE_PML);
                $this->command->info('Ihza PML user attached to REGSOSEK 2022 - PENDATAAN.');
            }
        }
        if ($ihzaPplUser && $regsosekPendataan) {
            if (!$ihzaPplUser->kegiatanStatistiks()->where('kegiatan_statistik_id', $regsosekPendataan->id)->exists()) {
                $ihzaPplUser->kegiatanStatistiks()->attach($regsosekPendataan->id);
                $ihzaPplUser->assignRole(Constants::ROLE_PPL);
                $this->command->info('Ihza PPL user attached to REGSOSEK 2022 - PENDATAAN.');
            }
        }
    }
}
