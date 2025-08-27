<?php

namespace App\Filament\Resources\AssignmentResponseResource\Pages;

use App\Filament\Resources\AssignmentResponseResource\AssignmentResponseResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListAssignmentResponses extends ListRecords
{
    protected static string $resource = AssignmentResponseResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
