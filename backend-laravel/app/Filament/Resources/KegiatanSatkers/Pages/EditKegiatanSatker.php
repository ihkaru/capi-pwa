<?php

namespace App\Filament\Resources\KegiatanSatkers\Pages;

use App\Filament\Resources\KegiatanSatkers\KegiatanSatkerResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditKegiatanSatker extends EditRecord
{
    protected static string $resource = KegiatanSatkerResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
