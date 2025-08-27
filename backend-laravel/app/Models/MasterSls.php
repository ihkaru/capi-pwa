<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Permission\Traits\HasRoles;

class MasterSls extends Model
{
    use HasFactory;
    protected $guarded = [];
    protected static Collection $mastersls;

    public static function getMasterSls()
    {
        self::$mastersls = self::$mastersls ?? self::get();
        return self::$mastersls;
    }

    // Properti statis untuk cache
    protected static ?array $indexedSls = null;

    /**
     * Memuat dan mengindeks seluruh data MasterSls untuk pencarian O(1) yang sangat cepat.
     * Hasilnya di-cache dalam static property sehingga query database hanya berjalan sekali per request.
     *
     * @return array
     */
    public static function getIndexedSls(): array
    {
        if (self::$indexedSls !== null) {
            return self::$indexedSls;
        }

        $byDesa = [];
        $byKec = [];
        $byKab = [];

        // Ambil semua data hanya sekali
        $allSls = self::query()->get();

        foreach ($allSls as $sls) {
            // Indeks berdasarkan kunci yang relevan
            if (!isset($byDesa[$sls->desa_kel_id])) $byDesa[$sls->desa_kel_id] = $sls;
            if (!isset($byKec[$sls->kec_id])) $byKec[$sls->kec_id] = $sls;
            if (!isset($byKab[$sls->kabkot_id])) $byKab[$sls->kabkot_id] = $sls;
        }

        return self::$indexedSls = [
            'by_desa' => $byDesa,
            'by_kec' => $byKec,
            'by_kab' => $byKab,
        ];
    }
}
