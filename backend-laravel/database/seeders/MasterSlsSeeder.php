<?php

namespace Database\Seeders;

use App\Imports\MasterSlsImport;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Maatwebsite\Excel\Excel as ExcelExcel;
use Maatwebsite\Excel\Facades\Excel;

class MasterSlsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        if(env("MIGRATION_ENV","local")) $fileLocation = "C:\\projects\\herd\\capi-pwa\\backend-laravel\\database\\data\\master_sls.csv";
        // if(env("MIGRATION_ENV","production")) $fileLocation = "./../database/data/master_sls.csv";
        Excel::import(new MasterSlsImport,$fileLocation,readerType: ExcelExcel::CSV);
    }
}
