<?php

namespace App\Filament\Resources\KegiatanStatistiks\Pages;

use App\Filament\Resources\KegiatanStatistiks\KegiatanStatistikResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditKegiatanStatistik extends EditRecord
{
    protected static string $resource = KegiatanStatistikResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
