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
        Schema::create('satker_wilayah_tugas', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('satker_id')->constrained('satkers')->cascadeOnDelete();
            $table->integer('wilayah_level');
            $table->string('wilayah_code_prefix');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('satker_wilayah_tugas');
    }
};
