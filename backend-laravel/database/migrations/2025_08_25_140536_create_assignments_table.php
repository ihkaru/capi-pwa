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
        Schema::create('assignments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('satker_id')->constrained('satkers')->cascadeOnDelete();
            $table->foreignUuid('kegiatan_statistik_id')->constrained('kegiatan_statistiks')->cascadeOnDelete();
            $table->foreignUuid('ppl_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('pml_id')->constrained('users')->cascadeOnDelete();
            $table->string('level_1_code')->nullable();
            $table->string('level_2_code')->nullable();
            $table->string('level_3_code')->nullable();
            $table->string('level_4_code')->nullable();
            $table->string('level_5_code')->nullable();
            $table->string('level_6_code')->nullable();

            $table->string('level_1_label')->nullable();
            $table->string('level_2_label')->nullable();
            $table->string('level_3_label')->nullable();
            $table->string('level_4_label')->nullable();
            $table->string('level_5_label')->nullable();
            $table->string('level_6_label')->nullable();

            $table->string('assignment_label');
            $table->json('prefilled_data')->nullable();
            $table->string('level_4_code_full')->index();
            $table->string('level_6_code_full')->nullable()->index();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assignments');
    }
};