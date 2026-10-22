<?php

namespace App\Http\Controllers;

use App\Models\Gift;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Home', [
            'sample_token' => 'demo-x7Kp2qLm9Vt4',
        ]);
    }

    public function demo(): Response
    {
        return Inertia::render('Gift/Demo');
    }

    public function help(): Response
    {
        return Inertia::render('Help');
    }

    public function privacy(): Response
    {
        return Inertia::render('Legal/Privacy');
    }

    public function terms(): Response
    {
        return Inertia::render('Legal/Terms');
    }
}
