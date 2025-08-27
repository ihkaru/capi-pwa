<?php

namespace App\Filament\Resources\ResponseHistoryResource\Pages;

use App\Filament\Resources\ResponseHistoryResource\ResponseHistoryResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditResponseHistory extends EditRecord
{
    protected static string $resource = ResponseHistoryResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}
