<?php

namespace App\Filament\Resources\SatkerWilayahTugasResource\Pages;

use App\Filament\Resources\SatkerWilayahTugasResource\SatkerWilayahTugasResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditSatkerWilayahTugas extends EditRecord
{
    protected static string $resource = SatkerWilayahTugasResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}
