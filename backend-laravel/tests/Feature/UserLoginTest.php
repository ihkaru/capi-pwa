<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use App\Models\Satker;
use Illuminate\Support\Facades\Hash;
use Filament\Facades\Filament;

class UserLoginTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test admin user can log in to Filament panel.
     */
    public function test_admin_user_can_log_in_to_filament_panel(): void
    {
        // Ensure roles are created
        \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'super_admin']);

        // Create a Satker for the admin user
        $satker = Satker::factory()->create();

        // Create the admin user with a satker_id and super_admin role
        $user = User::factory()->create([
            'name' => 'Super Admin',
            'email' => 'admin@admin.com',
            'password' => Hash::make('password'),
            'satker_id' => $satker->id,
        ]);
        $user->assignRole('super_admin');

        Filament::auth()->login($user);
        $this->assertAuthenticatedAs($user);
    }

    /**
     * Test admin user can access the Filament dashboard after logging in.
     */
    public function test_admin_user_can_access_dashboard_after_login(): void
    {
        // Ensure roles are created
        \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'super_admin']);

        // Create a Satker for the admin user (needed for user creation, but not necessarily for access for super_admin)
        $satker = Satker::factory()->create();

        // Create the admin user with a satker_id and super_admin role
        $user = User::factory()->create([
            'name' => 'Super Admin',
            'email' => 'admin@admin.com',
            'password' => Hash::make('password'),
            'satker_id' => $satker->id,
        ]);
        $user->assignRole('super_admin');

        // Log in the user directly
        Filament::auth()->login($user);

        // Log in the user directly
        Filament::auth()->login($user);

        // Make a GET request to the admin dashboard with the tenant in session
        $response = $this->actingAs($user)->withSession(['filament_tenant_id' => $satker->id])->get('/admin');

        // Assert that the response is successful (status 200)
        $response->assertStatus(200);

        // Assert that the dashboard content is present
        $response->assertSee('Dashboard'); // Or any other text expected on the dashboard
    }

    /**
     * Test Admin Satker user cannot access Filament panel directly.
     */
    public function test_admin_satker_user_cannot_access_filament_panel(): void
    {
        // Ensure roles are created
        \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'Admin Satker']);

        // Create a Satker for the admin user
        $satker = Satker::factory()->create();

        // Create the admin user with a satker_id and Admin Satker role
        $user = User::factory()->create([
            'name' => 'Admin Satker',
            'email' => 'adminsatker@example.com',
            'password' => Hash::make('password'),
            'satker_id' => $satker->id,
        ]);
        $user->assignRole('Admin Satker');

        Filament::auth()->login($user);
        $this->assertAuthenticatedAs($user);

        $response = $this->actingAs($user)->withSession(['filament_tenant_id' => $satker->id])->get('/admin');

        $response->assertStatus(403); // Should be a 403 Forbidden page
    }

    /**
     * Test PML user cannot access Filament panel directly.
     */
    public function test_pml_user_cannot_access_filament_panel(): void
    {
        // Ensure roles are created
        \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'PML']);

        // Create a Satker for the admin user
        $satker = Satker::factory()->create();

        // Create the admin user with a satker_id and PML role
        $user = User::factory()->create([
            'name' => 'PML User',
            'email' => 'pml@example.com',
            'password' => Hash::make('password'),
            'satker_id' => $satker->id,
        ]);
        $user->assignRole('PML');

        Filament::auth()->login($user);
        $this->assertAuthenticatedAs($user);

        $response = $this->actingAs($user)->withSession(['filament_tenant_id' => $satker->id])->get('/admin');

        $response->assertStatus(403); // Should be a 403 Forbidden page
    }

    /**
     * Test PPL user cannot access Filament panel directly.
     */
    public function test_ppl_user_cannot_access_filament_panel(): void
    {
        // Ensure roles are created
        \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'PPL']);

        // Create a Satker for the admin user
        $satker = Satker::factory()->create();

        // Create the admin user with a satker_id and PPL role
        $user = User::factory()->create([
            'name' => 'PPL User',
            'email' => 'ppl@example.com',
            'password' => Hash::make('password'),
            'satker_id' => $satker->id,
        ]);
        $user->assignRole('PPL');

        Filament::auth()->login($user);
        $this->assertAuthenticatedAs($user);

        $response = $this->actingAs($user)->withSession(['filament_tenant_id' => $satker->id])->get('/admin');

        $response->assertStatus(403); // Should be a 403 Forbidden page
    }
}
