<?php

namespace App\Filament\Resources\KegiatanSatkers\Schemas;

use Filament\Forms\Components\Select;
use Filament\Schemas\Schema;

class KegiatanSatkerForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Select::make('kegiatan_statistik_id')
                    ->relationship('kegiatanStatistik', 'name')
                    ->required()
                    ->preload(),
                Select::make('satker_id')
                    ->relationship('satker', 'name')
                    ->required()
                    ->preload(),
            ]);
    }
}
