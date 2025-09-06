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
        Schema::table('kegiatan_statistiks', function (Blueprint $table) {
            $table->boolean('allow_new_assignments_from_pwa')->default(false)->after('form_version');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('kegiatan_statistiks', function (Blueprint $table) {
            $table->dropColumn('allow_new_assignments_from_pwa');
        });
    }
};