using System;
using System.Text.Json;

var dto = new {
    id = Guid.NewGuid(),
    name = "Test",
    cnpj = "123",
    erpEmpresaId = 1,
    erpDeptoPadrao = 2,
    erpCentroPadrao = (int?)null,
    isDefault = true
};

Console.WriteLine(JsonSerializer.Serialize(dto));
