<?php

namespace App\Filament\Resources\Satkers\Pages;

use App\Filament\Resources\Satkers\SatkerResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListSatkers extends ListRecords
{
    protected static string $resource = SatkerResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
