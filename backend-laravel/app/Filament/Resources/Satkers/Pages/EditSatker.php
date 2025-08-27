<?php

namespace App\Filament\Resources\Satkers\Pages;

use App\Filament\Resources\Satkers\SatkerResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditSatker extends EditRecord
{
    protected static string $resource = SatkerResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
