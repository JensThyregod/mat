namespace MatBackend.Core.Models.Scoring;

public enum DanishGrade
{
    Minus3,  // -3
    Zero,    // 00
    Two,     // 02
    Four,    // 4
    Seven,   // 7
    Ten,     // 10
    Twelve   // 12
}

public static class DanishGradeExtensions
{
    public static string ToDisplayString(this DanishGrade grade) => grade switch
    {
        DanishGrade.Minus3 => "-3",
        DanishGrade.Zero => "00",
        DanishGrade.Two => "02",
        DanishGrade.Four => "4",
        DanishGrade.Seven => "7",
        DanishGrade.Ten => "10",
        DanishGrade.Twelve => "12",
        _ => throw new ArgumentOutOfRangeException(nameof(grade))
    };
}
