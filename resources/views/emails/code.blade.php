@extends('emails.layout')
@section('body')
  <p style="font-size:15px;line-height:1.6;margin:0 0 12px">Your Giftnify code is</p>
  <p style="font-size:34px;font-weight:800;letter-spacing:6px;margin:0 0 16px">{{ $code }}</p>
  <p style="font-size:13px;color:#6E5A68;margin:0">It expires in 10 minutes. If you didn't ask for it, ignore this email.</p>
@endsection
