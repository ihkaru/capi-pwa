<?php

namespace App\Filament\Resources\Users\Schemas;

use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Form;
use Filament\Schemas\Schema;

class UserForm
{
    public static function configure(Schema $form): Schema
    {
        return $form
            ->schema([
                Select::make('satker_id')
                    ->relationship('satker', 'name'),
                TextInput::make('name')
                    ->required(),
                TextInput::make('email')
                    ->label('Email address')
                    ->email()
                    ->required(),
                TextInput::make('password')
                    ->password()
                    ->default(null),
                TextInput::make('google_id')
                    ->default(null),
                TextInput::make('google_avatar')
                    ->default(null),
            ]);
    }
}
