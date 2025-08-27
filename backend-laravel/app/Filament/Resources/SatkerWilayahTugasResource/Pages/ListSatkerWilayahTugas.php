<?php

namespace App\Filament\Resources\SatkerWilayahTugasResource\Pages;

use App\Filament\Resources\SatkerWilayahTugasResource\SatkerWilayahTugasResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListSatkerWilayahTugas extends ListRecords
{
    protected static string $resource = SatkerWilayahTugasResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
