<?php

namespace App\Filament\Resources\KegiatanStatistikResource\Pages;

use App\Filament\Resources\KegiatanStatistikResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditKegiatanStatistik extends EditRecord
{
    protected static string $resource = KegiatanStatistikResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}
