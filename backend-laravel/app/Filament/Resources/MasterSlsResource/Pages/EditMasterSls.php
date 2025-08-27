<?php

namespace App\Filament\Resources\MasterSlsResource\Pages;

use App\Filament\Resources\MasterSlsResource\MasterSlsResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditMasterSls extends EditRecord
{
    protected static string $resource = MasterSlsResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}
