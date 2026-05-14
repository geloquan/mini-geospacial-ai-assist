<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Throwable;

class AuthService
{
    /**
     * @return array{token: string, user: User}|null
     */
    public function login(string $username, string $password): ?array
    {
        $user = User::query()->where('name', $username)->first();

        if ($user === null || ! Hash::check($password, $user->password)) {
            return null;
        }

        return [
            'token' => $this->issueToken($user),
            'user' => $user,
        ];
    }

    public function userFromToken(string $token): ?User
    {
        try {
            /** @var array<string, mixed> $payload */
            $payload = json_decode(Crypt::decryptString($token), true, 512, JSON_THROW_ON_ERROR);
        } catch (Throwable) {
            return null;
        }

        if (! isset($payload['sub'], $payload['exp'])) {
            return null;
        }

        if (Carbon::now()->timestamp >= (int) $payload['exp']) {
            return null;
        }

        return User::query()->find($payload['sub']);
    }

    private function issueToken(User $user): string
    {
        return Crypt::encryptString(json_encode([
            'sub' => $user->id,
            'exp' => Carbon::now()->addHours(12)->timestamp,
        ], JSON_THROW_ON_ERROR));
    }
}
