<?php

namespace App\Filament\Resources\KegiatanStatistiks\Schemas;

use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Form;
use Filament\Schemas\Schema;

class KegiatanStatistikForm
{
    public static function configure(Schema $form): Schema
    {
        return $form
            ->schema([
                TextInput::make('name')
                    ->required(),
                TextInput::make('year')
                    ->required(),
                DatePicker::make('start_date')
                    ->required(),
                DatePicker::make('end_date')
                    ->required(),
                DatePicker::make('extended_end_date'),
                Textarea::make('form_schema')
                    ->required()
                    ->columnSpanFull(),
                TextInput::make('form_version')
                    ->required()
                    ->numeric()
                    ->default(1),
            ]);
    }
}
