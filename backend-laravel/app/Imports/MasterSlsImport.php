<?php

namespace App\Imports;

use App\Models\MasterSls;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithBatchInserts;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\WithStartRow;
use Maatwebsite\Excel\Concerns\WithUpserts;

class MasterSlsImport implements ToModel, WithBatchInserts, WithChunkReading, WithStartRow, WithUpserts
{
    /**
     * @param array $row
     *
     * @return \Illuminate\Database\Eloquent\Model|null
     */
    public function model(array $row)
    {
        return new MasterSls([
            "desa_kel_id" => $row[0],
            "kec_id" => $row[1],
            "kabkot_id" => $row[2],
            "prov_id" => $row[3],
            "sls_id" => $row[4],
            "provinsi" => $row[5],
            "kabkot" => $row[6],
            "kecamatan" => $row[7],
            "desa_kel" => $row[8],
            "nama" => $row[9],
        ]);
    }
    public function chunkSize(): int
    {
        return 1000;
    }
    public function batchSize(): int
    {
        return 1000;
    }
    public function startRow(): int
    {
        return 2;
    }
    public function uniqueBy()
    {
        return "sls_id";
    }
}