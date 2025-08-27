<?php

namespace App\Filament\Resources\KegiatanStatistikResource\Pages;

use App\Filament\Resources\KegiatanStatistikResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListKegiatanStatistiks extends ListRecords
{
    protected static string $resource = KegiatanStatistikResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
