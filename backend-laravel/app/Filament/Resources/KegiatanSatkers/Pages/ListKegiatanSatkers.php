<?php

namespace App\Filament\Resources\KegiatanSatkers\Pages;

use App\Filament\Resources\KegiatanSatkers\KegiatanSatkerResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListKegiatanSatkers extends ListRecords
{
    protected static string $resource = KegiatanSatkerResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
