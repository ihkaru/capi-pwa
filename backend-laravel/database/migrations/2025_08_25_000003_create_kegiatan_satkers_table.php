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
        Schema::create('kegiatan_satkers', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('kegiatan_statistik_id')->constrained('kegiatan_statistiks')->cascadeOnDelete();
            $table->foreignUuid('satker_id')->constrained('satkers')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kegiatan_satkers');
    }
};