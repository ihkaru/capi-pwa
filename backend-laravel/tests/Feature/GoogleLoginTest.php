<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use Laravel\Socialite\Facades\Socialite;
use Mockery;
use Illuminate\Support\Facades\Hash;

class GoogleLoginTest extends TestCase
{
    use RefreshDatabase; // Use RefreshDatabase to ensure a clean database for each test

    protected function setUp(): void
    {
        parent::setUp();

        // Mock Socialite to prevent actual external API calls during testing
        $abstractUser = Mockery::mock('Laravel\Socialite\Two\User');
        $abstractUser
            ->shouldReceive('getId')
            ->andReturn(uniqid()) // Unique Google ID for each test
            ->shouldReceive('getName')
            ->andReturn('Test Google User')
            ->shouldReceive('getEmail')
            ->andReturn('ihza2karunia@gmail.com') // Use the specified email
            ->shouldReceive('getAvatar')
            ->andReturn('https://example.com/avatar.jpg');

        Socialite::shouldReceive('driver->stateless->user')
            ->andReturn($abstractUser);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /** @test */
    public function a_new_user_can_register_via_google()
    {
        $this->assertDatabaseCount('users', 0);

        $response = $this->postJson('/api/auth/google/callback', [
            'code' => 'dummy_code_from_google',
            'state' => 'dummy_state_token',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['access_token', 'token_type', 'user']);

        $this->assertDatabaseHas('users', [
            'email' => 'ihza2karunia@gmail.com',
            'google_id' => Socialite::driver('google')->user()->getId(),
            'satker_id' => null, // Should be a floating user
        ]);

        $this->assertDatabaseCount('users', 1);
    }

    /** @test */
    public function an_existing_user_can_link_google_account()
    {
        // Create a user with the same email but no google_id
        $existingUser = User::factory()->create([
            'email' => 'ihza2karunia@gmail.com',
            'google_id' => null,
            'password' => Hash::make('password'), // Simulate existing user with password
            'satker_id' => null,
        ]);

        $this->assertDatabaseCount('users', 1);
        $this->assertNull($existingUser->google_id);

        $response = $this->postJson('/api/auth/google/callback', [
            'code' => 'dummy_code_from_google',
            'state' => 'dummy_state_token',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['access_token', 'token_type', 'user']);

        $this->assertDatabaseHas('users', [
            'email' => 'ihza2karunia@gmail.com',
            'google_id' => Socialite::driver('google')->user()->getId(),
        ]);

        $this->assertDatabaseCount('users', 1); // Still one user
    }

    /** @test */
    public function an_existing_google_user_can_login()
    {
        // Create a user who already has a google_id
        $existingGoogleUser = User::factory()->create([
            'email' => 'ihza2karunia@gmail.com',
            'google_id' => 'existing_google_id',
            'password' => null,
            'satker_id' => null,
        ]);

        // Mock Socialite to return the *same* google_id for this test
        Socialite::shouldReceive('driver->stateless->user')
            ->andReturn(Mockery::mock('Laravel\Socialite\Two\User')
                ->shouldReceive('getId')->andReturn('existing_google_id')
                ->shouldReceive('getName')->andReturn('Test Google User')
                ->shouldReceive('getEmail')->andReturn('ihza2karunia@gmail.com')
                ->shouldReceive('getAvatar')->andReturn('https://example.com/avatar.jpg')
                ->getMock());

        $this->assertDatabaseCount('users', 1);

        $response = $this->postJson('/api/auth/google/callback', [
            'code' => 'dummy_code_from_google',
            'state' => 'dummy_state_token',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['access_token', 'token_type', 'user']);

        $this->assertDatabaseHas('users', [
            'email' => 'ihza2karunia@gmail.com',
            'google_id' => 'existing_google_id',
        ]);

        $this->assertDatabaseCount('users', 1); // Still one user
    }
}
