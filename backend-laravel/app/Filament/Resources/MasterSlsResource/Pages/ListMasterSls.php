<?php

namespace App\Filament\Resources\MasterSlsResource\Pages;

use App\Filament\Resources\MasterSlsResource\MasterSlsResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListMasterSls extends ListRecords
{
    protected static string $resource = MasterSlsResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
