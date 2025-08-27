<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('master_data', function (Blueprint $table) {
            $table->id();
            $table->string('type');
            $table->integer('version');
            $table->string('description')->nullable();
            $table->json('data');
            $table->boolean('is_active')->default(true);
            $table->unique(['type', 'version']);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('master_data');
    }
};
