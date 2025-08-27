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
        Schema::create('master_sls', function (Blueprint $table) {
            $table->id();
            $table->string("desa_kel_id");
            $table->string("kec_id");
            $table->string("kabkot_id");
            $table->string("prov_id");
            $table->string("sls_id")->unique();
            $table->string("provinsi");
            $table->string("kabkot");
            $table->string("kecamatan");
            $table->string("desa_kel");
            $table->string("nama");
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('master_sls');
    }
};
