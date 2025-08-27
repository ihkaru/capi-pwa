<?php

namespace App\Filament\Resources\KegiatanStatistiks\Pages;

use App\Filament\Resources\KegiatanStatistiks\KegiatanStatistikResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListKegiatanStatistiks extends ListRecords
{
    protected static string $resource = KegiatanStatistikResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
