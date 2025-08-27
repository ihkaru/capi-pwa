<?php

namespace App\Filament\Resources\ResponseHistoryResource\Pages;

use App\Filament\Resources\ResponseHistoryResource\ResponseHistoryResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListResponseHistories extends ListRecords
{
    protected static string $resource = ResponseHistoryResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
